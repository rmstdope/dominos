import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

/**
 * The token from an emailed link such as /invitation#<token>. It is read once and then dropped
 * from the address bar, so it does not linger in history or end up in a screenshot.
 */
export function useFragmentToken(): string {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => location.hash.slice(1));
  useEffect(() => {
    if (location.hash) {
      navigate({ pathname: location.pathname, search: location.search }, { replace: true });
    }
  }, [location, navigate]);
  return token;
}
