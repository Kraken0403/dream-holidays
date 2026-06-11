import { BadRequestException, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const logoDir = join(process.cwd(), 'uploads', 'logos');

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Post('company-logo')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req: any, _file: any, callback: any) => {
        if (!existsSync(logoDir)) mkdirSync(logoDir, { recursive: true });
        callback(null, logoDir);
      },
      filename: (_req: any, file: any, callback: any) => {
        const extension = extname(file.originalname || '').toLowerCase() || '.png';
        callback(null, `company-logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
      },
    }),
    fileFilter: (_req: any, file: any, callback: any) => {
      if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype || '')) {
        return callback(new BadRequestException('Only image logo files are allowed.'), false);
      }
      callback(null, true);
    },
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  uploadCompanyLogo(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Logo file is required.');
    return { url: `${req.protocol}://${req.get('host')}/uploads/logos/${file.filename}` };
  }
}
