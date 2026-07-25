import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from '@uploadthing/react'
import type { StudioFileRouter } from '@/app/api/uploadthing/core'

export const UploadButton = generateUploadButton<StudioFileRouter>()
export const UploadDropzone = generateUploadDropzone<StudioFileRouter>()

export const { useUploadThing } = generateReactHelpers<StudioFileRouter>()
