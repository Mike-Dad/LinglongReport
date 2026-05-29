import html2canvas from 'html2canvas';

const IMG_SCALE = 2;

export async function renderToOffscreen(element) {
  // Temporarily lift overflow clipping so wide tables aren't truncated
  const prevOverflow = element.style.overflow;
  const prevOverflowX = element.style.overflowX;
  const prevPaddingBottom = element.style.paddingBottom;
  element.style.overflow = 'visible';
  element.style.overflowX = 'visible';
  element.style.paddingBottom = '24px';

  let canvas;
  try {
    canvas = await html2canvas(element, {
      scale: IMG_SCALE,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
  } finally {
    element.style.overflow = prevOverflow;
    element.style.overflowX = prevOverflowX;
    element.style.paddingBottom = prevPaddingBottom;
  }
  return canvas;
}

export async function copyMarkdown(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function copyImageFromElement(element) {
  const canvas = await renderToOffscreen(element);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export function downloadImageFromElement(element, filename) {
  return renderToOffscreen(element).then((canvas) => {
    const a = document.createElement('a');
    a.download = filename || `linglong-analysis-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}
