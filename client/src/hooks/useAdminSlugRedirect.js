import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isMongoObjectId } from "../utils/doctorUrls.js";

export function useAdminSlugRedirect({ record, paramKey, buildPath }) {
  const navigate = useNavigate();

  useEffect(() => {
    const slug = record?.slug;
    if (!slug || !paramKey) return;
    if (isMongoObjectId(paramKey) && slug !== paramKey) {
      navigate(buildPath(record), { replace: true });
    }
  }, [record, paramKey, buildPath, navigate]);
}
