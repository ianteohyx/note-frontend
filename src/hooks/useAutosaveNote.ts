import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import type { MarkdownStorage } from 'tiptap-markdown';
import type { Editor } from '@tiptap/core';
import { updateNote } from '../api/notes';
import { useAuth } from './useAuth';
import type { ErrorResponse } from '../types/auth';
import type { NoteDto } from '../types/notes';

const AUTOSAVE_DELAY_MS = 1000;

function buildMarkdown(title: string, content: string): string {
  return `# ${title}\n\n${content}`;
}

function splitMarkdown(markdown: string): { title: string; content: string } {
  const newlineIndex = markdown.indexOf('\n');
  const firstLine = newlineIndex === -1 ? markdown : markdown.slice(0, newlineIndex);
  const rest = newlineIndex === -1 ? '' : markdown.slice(newlineIndex + 1).replace(/^\n+/, '');
  const title = firstLine.replace(/^#{1,6}\s*/, '').trim();
  return { title, content: rest };
}

interface PendingSave {
  noteId: number;
  title: string;
  content: string;
}

interface UseAutosaveNoteResult {
  editor: Editor | null;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

export function useAutosaveNote(
  note: NoteDto | null,
  onSaved: (id: number, patch: { title: string; dateModified: string }) => void,
): UseAutosaveNoteResult {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<PendingSave | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending || !token) return;
    pendingRef.current = null;

    setSaving(true);
    setSaveError(null);

    try {
      const res = await updateNote(
        pending.noteId,
        { noteTitle: pending.title, noteContent: pending.content },
        token,
      );
      if (res.responseOutcome === 'SUCCESS') {
        const dateModified = new Date().toISOString();
        setLastSavedAt(dateModified);
        onSavedRef.current(pending.noteId, { title: pending.title, dateModified });
      } else {
        setSaveError((res as ErrorResponse).message ?? 'Failed to save note.');
      }
    } catch {
      setSaveError('Network error. Your latest changes may not be saved.');
    } finally {
      setSaving(false);
    }
  }, [token]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1] },
          blockquote: false,
          codeBlock: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          listKeymap: false,
          link: false,
          horizontalRule: false,
        }),
        Markdown,
        Placeholder.configure({
          placeholder: ({ node }) => (node.type.name === 'heading' ? 'Title' : 'Start writing…'),
        }),
      ],
      content: note ? buildMarkdown(note.title, note.content) : '',
      editable: note !== null,
      immediatelyRender: false,
      onUpdate: ({ editor: e }) => {
        if (!note) return;
        const markdown = (e.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown();
        const { title, content } = splitMarkdown(markdown);
        pendingRef.current = { noteId: note.id, title, content };

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          flush();
        }, AUTOSAVE_DELAY_MS);
      },
    },
    [note?.id],
  );

  useEffect(() => {
    setLastSavedAt(note?.dateModified ?? null);
    setSaveError(null);
  }, [note?.id, note?.dateModified]);

  // Flush any pending debounced edit when switching notes or leaving the page.
  useEffect(() => {
    return () => {
      flush();
    };
  }, [note?.id, flush]);

  return { editor, saving, saveError, lastSavedAt };
}
