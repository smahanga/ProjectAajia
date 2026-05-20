import { z } from "zod";

// Minimal ProseMirror doc validation per editor-patterns guidance:
// type+structure check is enough to keep obvious garbage out of the column.
// Full schema validation can come later if/when we need it.
export const proseMirrorDocSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const patchDocumentBodySchema = z
  .object({
    title: z.string().max(200).optional(),
    content: proseMirrorDocSchema.optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Body must include at least one of: title, content",
  });

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export type PatchDocumentBody = z.infer<typeof patchDocumentBodySchema>;
