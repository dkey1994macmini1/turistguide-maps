// Compatibility shim: validation moved into feature modules.

export {
  validateCoordinates,
  validateLatitude,
  validateLatitudeEither,
  validateLongitude,
  validateLongitudeEither,
  validateUrl,
  validateUrlEither,
} from "@/features/stop/stop.validation";

export { validateSlug, validateSlugEither } from "@/features/plan/plan.validation";
