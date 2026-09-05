import { BadRequestException, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const logoDir = join(process.cwd(), 'uploads', 'logos');
const signatureDir = join(process.cwd(), 'uploads', 'signatures');
const paymentProofDir = join(process.cwd(), 'uploads', 'payment-proofs');

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Post('authorized-signature')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req: any, _file: any, callback: any) => {
        if (!existsSync(signatureDir)) mkdirSync(signatureDir, { recursive: true });
        callback(null, signatureDir);
      },
      filename: (_req: any, file: any, callback: any) => {
        const extension = extname(file.originalname || '').toLowerCase() || '.png';
        callback(null, `authorized-signature-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
      },
    }),
    fileFilter: (_req: any, file: any, callback: any) => {
      if (!/^image\/(png|jpe?g|webp)$/.test(file.mimetype || '')) {
        return callback(new BadRequestException('Authorized signature must be a PNG, JPG, or WebP image.'), false);
      }
      callback(null, true);
    },
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  uploadAuthorizedSignature(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Authorized signature image is required.');
    return { url: `${req.protocol}://${req.get('host')}/uploads/signatures/${file.filename}` };
  }

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

  @Post('payment-proof')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req: any, _file: any, callback: any) => {
        if (!existsSync(paymentProofDir)) mkdirSync(paymentProofDir, { recursive: true });
        callback(null, paymentProofDir);
      },
      filename: (_req: any, file: any, callback: any) => {
        const extension = extname(file.originalname || '').toLowerCase();
        callback(null, `payment-proof-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
      },
    }),
    fileFilter: (_req: any, file: any, callback: any) => {
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype || '') && file.mimetype !== 'application/pdf') {
        return callback(new BadRequestException('Payment proof must be an image or PDF.'), false);
      }
      callback(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  uploadPaymentProof(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Payment proof file is required.');
    return {
      url: `${req.protocol}://${req.get('host')}/uploads/payment-proofs/${file.filename}`,
      originalName: file.originalname,
    };
  }
}
