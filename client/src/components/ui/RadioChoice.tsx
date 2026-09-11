import styled from 'styled-components';
import type { ReactNode } from 'react';

const Pill = styled.label<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 18px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1.5px solid ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  background: ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.surface)};
  color: ${({ $selected, theme }) => ($selected ? '#fff' : theme.colors.text)};
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
`;

interface RadioChoiceProps {
  name: string;
  value: string;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}

/** A pill-shaped radio option used by the RSVP form. */
export function RadioChoice({ name, value, selected, onSelect, children }: RadioChoiceProps) {
  return (
    <Pill $selected={selected}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
      />
      <span>{children}</span>
    </Pill>
  );
}
