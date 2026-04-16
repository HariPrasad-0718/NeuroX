export default function Logo() {
  return (
    <div className="flex gap-[9px] items-center">
      <div className="relative shrink-0 w-8 h-8">
        <svg className="block w-full h-full" fill="none" viewBox="0 0 32 32">
          <rect fill="#702DFF" height="32" rx="16" width="32" />
          <g>
            <circle cx="11.125" cy="11.125" fill="white" r="2.3" />
            <circle cx="11.125" cy="20.875" fill="white" r="2.3" />
            <circle cx="20.875" cy="11.125" fill="white" r="2.3" />
            <circle cx="16" cy="16" fill="white" r="2.3" />
            <circle cx="20.875" cy="20.875" fill="white" r="2.3" />
          </g>
        </svg>
      </div>
      <span className="font-extrabold text-base uppercase text-[#702DFF]">
        NEUROX
      </span>
    </div>
  );
}
