import styled from 'styled-components';

const Img = styled.img`
  display: block;
  width: 100%;
  max-width: min(420px, 78vw);
  margin: 4px auto 0;
`;

/**
 * Optional photo shown just under the couple names.
 * Renders nothing when no image exists in the repo.
 */
export function HeroImage({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return null;
  return <Img src={src} alt={alt} decoding="async" fetchPriority="high" />;
}
