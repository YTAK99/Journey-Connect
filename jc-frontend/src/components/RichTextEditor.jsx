import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FontFamily, TextStyle } from "@tiptap/extension-text-style";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { normalizeEditorContent } from "../utils/richText";

const copy = {
  ko: {
    fonts: ["기본 글꼴", "깔끔한 고딕", "감성적인 명조", "부드러운 고딕", "기록형 모노"],
    fontSelect: "글꼴 선택",
    heading2: "제목 2",
    heading3: "제목 3",
    bold: "굵게",
    italic: "기울임",
    strike: "취소선",
    bulletList: "글머리 목록",
    orderedList: "번호 목록",
    quote: "인용문",
    undo: "실행 취소",
    redo: "다시 실행",
    characters: "자",
  },
  en: {
    fonts: ["Default font", "Clean sans", "Editorial serif", "Soft sans", "Travel mono"],
    fontSelect: "Choose font",
    heading2: "Heading 2",
    heading3: "Heading 3",
    bold: "Bold",
    italic: "Italic",
    strike: "Strikethrough",
    bulletList: "Bullet list",
    orderedList: "Numbered list",
    quote: "Quote",
    undo: "Undo",
    redo: "Redo",
    characters: " characters",
  },
};

const fontValues = ["", "Arial", "Georgia", "Trebuchet MS", "Courier New"];

function ToolbarButton({ active = false, disabled = false, label, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, lang = "ko" }) {
  const t = copy[lang] || copy.ko;
  // 에디터 내부 변경은 HTML로 부모 폼에 전달하며, 저장 전 최종 정제는 백엔드가 담당합니다.
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontFamily],
    content: normalizeEditorContent(value),
    editorProps: {
      attributes: {
        class:
          "rich-text-editor min-h-80 px-5 py-4 text-[15px] leading-7 text-slate-800 outline-none dark:text-slate-100",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  // Tiptap의 선택/서식 트랜잭션을 구독해 입력을 기다리지 않고 툴바 상태를 즉시 다시 그립니다.
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      heading2: currentEditor?.isActive("heading", { level: 2 }) || false,
      heading3: currentEditor?.isActive("heading", { level: 3 }) || false,
      bold: currentEditor?.isActive("bold") || false,
      italic: currentEditor?.isActive("italic") || false,
      strike: currentEditor?.isActive("strike") || false,
      bulletList: currentEditor?.isActive("bulletList") || false,
      orderedList: currentEditor?.isActive("orderedList") || false,
      blockquote: currentEditor?.isActive("blockquote") || false,
      currentFont: currentEditor?.getAttributes("textStyle").fontFamily || "",
      canUndo: currentEditor?.can().chain().undo().run() || false,
      canRedo: currentEditor?.can().chain().redo().run() || false,
      characterCount: currentEditor?.getText().length || 0,
    }),
  });

  useEffect(() => {
    // 수정 글 로딩처럼 외부 value가 뒤늦게 바뀐 경우에만 에디터 내용을 동기화합니다.
    if (!editor) return;
    const normalized = normalizeEditorContent(value);
    if (editor.getHTML() !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="min-h-80 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-teal-950/40">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-800/70">
        <select
          value={toolbarState.currentFont}
          onChange={(event) => {
            const font = event.target.value;
            if (font) editor.chain().focus().setFontFamily(font).run();
            else editor.chain().focus().unsetFontFamily().run();
          }}
          aria-label={t.fontSelect}
          className="mr-1 h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-teal-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        >
          {fontValues.map((value, index) => (
            <option key={value || "default"} value={value}>{t.fonts[index]}</option>
          ))}
        </select>

        <ToolbarButton label={t.heading2} active={toolbarState.heading2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={17} />
        </ToolbarButton>
        <ToolbarButton label={t.heading3} active={toolbarState.heading3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={17} />
        </ToolbarButton>
        <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-600" />
        <ToolbarButton label={t.bold} active={toolbarState.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={17} />
        </ToolbarButton>
        <ToolbarButton label={t.italic} active={toolbarState.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={17} />
        </ToolbarButton>
        <ToolbarButton label={t.strike} active={toolbarState.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={17} />
        </ToolbarButton>
        <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-600" />
        <ToolbarButton label={t.bulletList} active={toolbarState.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={17} />
        </ToolbarButton>
        <ToolbarButton label={t.orderedList} active={toolbarState.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={17} />
        </ToolbarButton>
        <ToolbarButton label={t.quote} active={toolbarState.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={17} />
        </ToolbarButton>
        <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-600" />
        <ToolbarButton label={t.undo} disabled={!toolbarState.canUndo} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={17} />
        </ToolbarButton>
        <ToolbarButton label={t.redo} disabled={!toolbarState.canRedo} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={17} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
      <div className="border-t border-slate-100 px-4 py-2 text-right text-xs text-slate-400 dark:border-slate-800">
        {toolbarState.characterCount}{t.characters}
      </div>
    </div>
  );
}
