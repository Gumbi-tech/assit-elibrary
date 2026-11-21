import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  coursePdfUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
  }).onUploadComplete(async ({ file }) => {
    // file.ufsUrl (or file.url) gives you the hosted file URL to save in Prisma
    return { uploadedUrl: file.ufsUrl };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;