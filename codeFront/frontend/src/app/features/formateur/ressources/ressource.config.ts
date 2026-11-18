import { TypeRessource } from './models/ressource.model';
export const TYPES_RESSOURCES: TypeRessource[] = [
  'VIDEO',
  'PDF',
  'DOCUMENT',
  'TEXTE',
  'IMAGE',
  'PRESENTATION',
];
export const LIBELLES_RESSOURCES: Record<TypeRessource, string> = {
  VIDEO: 'Vidéo',
  PDF: 'PDF',
  DOCUMENT: 'Document',
  TEXTE: 'Texte',
  IMAGE: 'Image',
  PRESENTATION: 'Présentation',
};
export const FORMATS_RESSOURCES: Record<TypeRessource, string> = {
  VIDEO: '.mp4,.webm,.mov',
  PDF: '.pdf',
  DOCUMENT: '.docx,.odt,.rtf',
  TEXTE: '.txt',
  IMAGE: '.jpg,.jpeg,.png,.webp,.gif',
  PRESENTATION: '.pptx,.odp',
};
