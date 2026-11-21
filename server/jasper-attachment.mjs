const maxBytes = 2 * 1024 * 1024;
export const attachmentRequestLimit = 50_000 + 4 * Math.ceil(maxBytes / 3);
const formats = {
  'application/pdf': {extension: /\.pdf$/i, signature: Buffer.from('%PDF-')},
  'image/png': {extension: /\.png$/i, signature: Buffer.from('89504e470d0a1a0a', 'hex')},
  'image/jpeg': {extension: /\.jpe?g$/i, signature: Buffer.from('ffd8ff', 'hex')},
};

export function validateAttachment(value) {
  if (value === undefined) return;
  const {name, type, content} = value || {};
  const format = Object.hasOwn(formats, type) && formats[type];
  if (!format || typeof name !== 'string' || name.length > 150 ||
      /[\x00-\x1f\x7f/\\]/.test(name) || !format.extension.test(name) ||
      typeof content !== 'string' || !content || content.length > 4 * Math.ceil(maxBytes / 3)) {
    throw Error('Attach one PDF, PNG or JPEG up to 2 MB.');
  }
  const bytes = Buffer.from(content, 'base64');
  if (bytes.length > maxBytes || bytes.toString('base64') !== content ||
      !bytes.subarray(0, format.signature.length).equals(format.signature)) {
    throw Error('The attachment did not match the selected file type or size limit.');
  }
  return {name, type, content};
}

export function modelAttachment({name, type, content}) {
  const dataUrl = `data:${type};base64,${content}`;
  return type === 'application/pdf'
    ? {type: 'input_file', filename: name, file_data: dataUrl}
    : {type: 'input_image', image_url: dataUrl, detail: 'high'};
}
