/**
 * CRM Module Exports
 */

export { CRMCardBuilder, buildDealCard, buildContactCard, buildCompanyCard } from './card-builder';
export { PropertyUpdater, REQUIRED_PROPERTIES } from './property-updates';
export { InteractiveCRMCardBuilder } from './interactive-card';
export type {
  InteractiveCardConfig,
  InteractiveCard,
  InteractiveElement,
  ElementAction,
  RealTimeConfig,
  CardAnalytics,
  QuickAction,
  CardWidget,
} from './interactive-card';
