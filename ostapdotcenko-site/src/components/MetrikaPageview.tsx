import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

const METRIKA_ID = 107237595;

/* Счётчик Метрики шлёт "hit" один раз, при первой загрузке скрипта. React Router
   переключает страницы без перезагрузки, так что переходы внутри сайта после
   первой загрузки были бы невидимы для Метрики — отправляем hit вручную при
   каждой смене маршрута. */
export default function MetrikaPageview() {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.ym?.(METRIKA_ID, "hit", location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}
