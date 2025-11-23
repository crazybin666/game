import React from 'react';
import { Step } from '../types';

interface StepCardProps {
  step: Step;
  isActive: boolean;
  isPast: boolean;
}

const StepCard: React.FC<StepCardProps> = ({ step, isActive, isPast }) => {
  // Determine styles based on status
  let borderClass = 'border-slate-200';
  let bgClass = 'bg-white';
  let textClass = 'text-slate-500';
  let icon = (
    <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs font-medium text-slate-400">
      {step.index + 1}
    </div>
  );

  if (step.status === 'completed') {
    borderClass = 'border-green-200';
    bgClass = 'bg-green-50/50';
    textClass = 'text-slate-600';
    icon = (
      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  } else if (step.status === 'in_progress') {
    borderClass = 'border-blue-400 ring-2 ring-blue-100';
    bgClass = 'bg-white';
    textClass = 'text-slate-800';
    icon = (
      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 animate-pulse">
        <span className="text-xs font-bold">{step.index + 1}</span>
      </div>
    );
  }

  return (
    <div className={`relative flex gap-4 p-4 rounded-xl border transition-all duration-300 ${borderClass} ${bgClass} ${isActive ? 'shadow-md scale-[1.01]' : 'shadow-sm'}`}>
      {/* Timeline Connector */}
      <div className="flex flex-col items-center">
        {icon}
        {!isPast && <div className="h-full w-0.5 bg-slate-100 mt-2 rounded-full" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-semibold text-lg truncate pr-2 ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
            {step.title}
          </h3>
          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {step.estimated_duration_minutes} 分钟
          </span>
        </div>
        
        <p className={`text-sm leading-relaxed mb-3 ${textClass}`}>
          {step.description}
        </p>

        {step.required_resources && step.required_resources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {step.required_resources.map((res, i) => (
              <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <svg className="w-3 h-3 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {res}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepCard;