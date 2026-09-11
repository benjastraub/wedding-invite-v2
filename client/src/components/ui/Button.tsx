import styled, { css } from 'styled-components';

type ButtonVariant = 'primary' | 'outline';

export const Button = styled.button<{ $variant?: ButtonVariant }>`
  display: inline-block;
  padding: 12px 30px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1.5px solid ${({ theme }) => theme.colors.primary};
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    filter 0.2s ease;

  ${({ $variant = 'primary', theme }) =>
    $variant === 'outline'
      ? css`
          background: transparent;
          color: ${theme.colors.primary};
          &:hover {
            background: ${theme.colors.primary};
            color: #fff;
          }
        `
      : css`
          background: ${theme.colors.primary};
          border-color: ${theme.colors.primary};
          color: #fff;
          &:hover {
            filter: brightness(1.07);
            transform: translateY(-1px);
          }
        `}

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    filter: none;
  }
`;
