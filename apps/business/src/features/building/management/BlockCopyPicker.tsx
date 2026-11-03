"use client";
import type { BlockDraft } from "./inventory-draft";
import { cloneBlock } from "./clone-block";

export function BlockCopyPicker({ blocks, onCopy }: { blocks: BlockDraft[]; onCopy: (block: BlockDraft) => void }) {
  if (!blocks.length) return null;
  return <section className="project-block-fields">
    <label>Өмнөх блокоос хувилах
      <select value="" onChange={event => {
        const source = blocks.find(block => block.id === event.target.value);
        if (source) onCopy(cloneBlock(source, blocks.map(block => block.name)));
      }}>
        <option value="">Хувилах блок сонгох…</option>
        {blocks.map(block => <option key={block.id} value={block.id}>{block.name} · {block.floors.length} давхар · {block.floors.reduce((sum, floor) => sum + floor.units.length, 0)} байр</option>)}
      </select>
    </label>
    <p>Давхар, байрны мэдээлэл, загварын оноолт, фасадын зураг ба хүрээг хуулна. Шинэ блокийн нэрийг доор өөрчилж болно.</p>
  </section>;
}
