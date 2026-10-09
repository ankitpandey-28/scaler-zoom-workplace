import Image from "next/image";
export default function Brand({ workplace = false }: { workplace?: boolean }) {
  return (
    <span className={`zoom-brand ${workplace ? "with-workplace" : ""}`}>
      <Image src="/zoom-logo.svg" alt="Zoom" width={110} height={25} priority />
      {workplace && <span>Workplace</span>}
    </span>
  );
}
