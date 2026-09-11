import styled, { css } from 'styled-components';

const controlStyles = css`
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: #fff;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
  transition: border-color 0.2s ease;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.muted};
    opacity: 0.7;
  }
`;

/** Label + control wrapper used by every form field. */
export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.muted};
`;

export const Input = styled.input`
  ${controlStyles}
`;

export const Textarea = styled.textarea`
  ${controlStyles}
  min-height: 110px;
  resize: vertical;
`;

export const Hint = styled.span`
  font-size: 0.8rem;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.muted};
  opacity: 0.85;
`;
