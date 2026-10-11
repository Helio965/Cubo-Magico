import { useId } from 'react';

/** Marca do CubeForge: cubo isométrico com faces em gradiente e fissuras de "forja". */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6f95ff" />
          <stop offset="1" stopColor="#4a6dff" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a6bff" />
          <stop offset="1" stopColor="#5b3fe0" />
        </linearGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c2d1ff" />
          <stop offset="1" stopColor="#e4dbff" />
        </linearGradient>
      </defs>
      <path d="M32 4 58 18 32 32 6 18Z" fill={`url(#${id}c)`} />
      <path d="M6 18 32 32v28L6 46Z" fill={`url(#${id}a)`} />
      <path d="M58 18 32 32v28l26-14Z" fill={`url(#${id}b)`} />
      <g stroke="rgba(10,12,30,0.55)" strokeWidth="1.6" fill="none" strokeLinejoin="round">
        <path d="M14.7 13.3 40.7 27.3M23.3 8.7 49.3 22.7M49.3 13.3 23.3 27.3M40.7 8.7 14.7 22.7" />
        <path d="M6 27.3 32 41.3M6 36.7 32 50.7M14.7 22.7v28M23.3 27.3v28" />
        <path d="M58 27.3 32 41.3M58 36.7 32 50.7M49.3 22.7v28M40.7 27.3v28" />
      </g>
    </svg>
  );
}
