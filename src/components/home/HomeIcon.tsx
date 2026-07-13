import {
  CheckIcon,
  CreditCardIcon,
  HeadsetIcon,
  ShieldIcon,
  StarIcon,
  TruckIcon,
  WhatsAppIcon,
} from '@/components/ui/Icon';
import type { HomeIconName } from '@/lib/homeContent';

type Props = { name: HomeIconName; size?: number; className?: string };

export const HomeIcon = ({ name, size = 20, className }: Props) => {
  switch (name) {
    case 'truck':
      return <TruckIcon size={size} className={className} />;
    case 'shield':
      return <ShieldIcon size={size} className={className} />;
    case 'headset':
      return <HeadsetIcon size={size} className={className} />;
    case 'credit-card':
      return <CreditCardIcon size={size} className={className} />;
    case 'check':
      return <CheckIcon size={size} className={className} />;
    case 'whatsapp':
      return <WhatsAppIcon size={size} className={className} />;
    case 'star':
      return <StarIcon size={size} className={className} />;
    default:
      return <CheckIcon size={size} className={className} />;
  }
};
