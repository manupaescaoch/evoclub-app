import {
  Trophy, Flame, Dumbbell, Zap, Crown, Star, HeartPulse, CalendarCheck, MessageCircle,
} from "lucide-react";

const MAP: Record<string, any> = {
  trophy: Trophy,
  flame: Flame,
  dumbbell: Dumbbell,
  zap: Zap,
  crown: Crown,
  star: Star,
  "heart-pulse": HeartPulse,
  "calendar-check": CalendarCheck,
  "message-circle": MessageCircle,
};

const AchievementIcon = ({ icon, size = 20 }: { icon: string; size?: number }) => {
  const Cmp = MAP[icon] || Trophy;
  return <Cmp size={size} />;
};

export default AchievementIcon;
