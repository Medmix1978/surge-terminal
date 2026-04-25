import { TradingProvider } from '@/context/TradingContext';
import EventGraph from '@/components/EventGraph';
import CustomCursor from '@/components/CustomCursor';
import HeaderBar from '@/sections/HeaderBar';
import HeroOverlay from '@/sections/HeroOverlay';
import LeftPanel from '@/sections/LeftPanel';
import RightPanel from '@/sections/RightPanel';
import FooterInfo from '@/sections/FooterInfo';

export default function App() {
  return (
    <TradingProvider>
      <div className="relative w-screen h-screen overflow-hidden bg-[#030C12]">
        <EventGraph />
        <CustomCursor />
        <HeaderBar />
        <LeftPanel />
        <RightPanel />
        <HeroOverlay />
        <FooterInfo />
      </div>
    </TradingProvider>
  );
}
