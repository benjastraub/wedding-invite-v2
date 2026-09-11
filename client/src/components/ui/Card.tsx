import styled from 'styled-components';

export const Card = styled.div`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.soft};
  padding: 28px 24px;
`;
