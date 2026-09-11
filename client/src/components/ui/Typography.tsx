import styled from 'styled-components';

/** Small uppercase label above a section title. */
export const Eyebrow = styled.p`
  margin: 0 0 12px;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.accent};
`;

/** Big display heading (couple names, section titles). */
export const DisplayTitle = styled.h1`
  font-size: clamp(2.6rem, 7vw, 4.2rem);
  font-weight: 500;
  line-height: 1.1;
  color: ${({ theme }) => theme.colors.text};
`;

export const SectionTitle = styled.h2`
  font-size: clamp(1.05rem, 2.5vw, 1.4rem);
  font-weight: 500;
  text-align: center;
  margin-bottom: 28px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
`;

export const BodyText = styled.p`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;
