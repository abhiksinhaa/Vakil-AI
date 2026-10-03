'use client';

import { useApp } from '../context/AppContext';
import DraftGenerator from './DraftGenerator';
import IndividualDraftGenerator from './IndividualDraftGenerator';

export default function GenerateExperience() {
  const { profile } = useApp();
  return profile?.user_type === 'individual' ? <IndividualDraftGenerator /> : <DraftGenerator />;
}