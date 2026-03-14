"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Link as LinkIcon,
  ImageIcon,
  Minus,
} from "lucide-react";

function ToolButton({ onClick, isActive, children }: { onClick: () => void; isActive?: boolean; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant={isActive ? "secondary" : "ghost"}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Начните писать..." }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  function addLink() {
    const url = window.prompt("URL:");
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  }

  function addImage() {
    const url = window.prompt("URL изображения:");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div className="border rounded-md">
      <div className="flex flex-wrap items-center gap-0.5 p-1 border-b">
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")}>
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")}>
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")}>
          <Strikethrough className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive("code")}>
          <Code className="h-4 w-4" />
        </ToolButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })}>
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })}>
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })}>
          <Heading3 className="h-4 w-4" />
        </ToolButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")}>
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")}>
          <Quote className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolButton onClick={addLink}><LinkIcon className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={addImage}><ImageIcon className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolButton onClick={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4" /></ToolButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
