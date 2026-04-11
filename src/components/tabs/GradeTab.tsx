import { useState } from "react";

const daysOfWeek = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const trainers = ["André", "Carla", "Julia", "Pedro", "Fernanda"];

const generateClasses = () => {
  const classes = [];
  for (let h = 5; h <= 22; h++) {
    classes.push({
      hour: h,
      name: "Musculação",
      trainer: trainers[h % trainers.length],
      duration: 60,
      slots: 14,
      isPeak: (h >= 6 && h <= 9) || (h >= 17 && h <= 20),
    });
  }
  return classes;
};

const GradeTab = () => {
  const [activeDay, setActiveDay] = useState(1); // Terça
  const classes = generateClasses();
  const currentHour = 8;

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-border">
        <h1 className="font-barlow font-bold text-xl text-foreground">GRADE DE AULAS</h1>
        <p className="text-xs text-muted font-dm">Iron Lifting Club</p>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {daysOfWeek.map((d, i) => (
          <button
            key={d}
            onClick={() => setActiveDay(i)}
            className={`px-4 py-1.5 rounded-full text-xs font-dm font-semibold shrink-0 transition-colors
              ${i === activeDay ? "bg-primary text-white cta-shadow" : "bg-white text-muted card-shadow"}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="px-4 pb-4">
        {classes.map((c) => {
          const isCurrent = c.hour === currentHour;
          return (
            <div key={c.hour} className="flex gap-3 mb-3">
              {/* Time axis */}
              <div className="flex flex-col items-center w-12 shrink-0">
                <span className="text-[11px] font-barlow font-bold text-muted">
                  {String(c.hour).padStart(2, "0")}:00
                </span>
                <div className={`flex-1 w-0.5 mt-1 ${isCurrent ? "bg-primary" : "bg-border"}`} />
              </div>

              {/* Card */}
              <div className={`flex-1 rounded-2xl p-3 card-shadow ${isCurrent ? "bg-primary/5 border-l-4 border-l-primary" : "bg-white"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-dm font-semibold text-sm text-foreground">{c.name}</p>
                      {c.isPeak && (
                        <span className="text-[9px] font-barlow font-bold tracking-[1px] uppercase bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">HORÁRIO NOBRE</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted font-dm mt-0.5">Prof. {c.trainer} · {c.duration} min</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[11px] text-green-600 font-dm">{c.slots} vagas</span>
                    </div>
                  </div>
                  <button className="bg-primary text-white text-[11px] font-dm font-semibold px-3 py-1.5 rounded-lg cta-shadow">
                    Reservar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GradeTab;
