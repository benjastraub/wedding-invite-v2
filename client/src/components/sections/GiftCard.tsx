import styled from 'styled-components';
import { useLanguage } from '../../i18n/LanguageContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const Wrapper = styled.div`
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  text-align: center;
`;

const Title = styled.h3`
  font-size: 1.1rem;
  margin-bottom: 10px;
`;

const Body = styled.p`
  margin: 0 0 18px;
  color: ${({ theme }) => theme.colors.muted};
`;

/** External link to the wedding gift registry (e.g. a wishlist site). */
export function GiftCard({ url }: { url: string }) {
  const { t } = useLanguage();
  return (
    <Wrapper>
      <Card>
        <Title>{t('landing.giftsTitle')}</Title>
        <Body>{t('landing.giftsBody')}</Body>
        <Button as="a" href={url} target="_blank" rel="noopener noreferrer" $variant="outline">
          {t('landing.giftsLink')}
        </Button>
      </Card>
    </Wrapper>
  );
}
