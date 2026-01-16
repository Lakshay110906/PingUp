import multer from 'multer'

const storage = multer.diskStorage({})

export const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }
})