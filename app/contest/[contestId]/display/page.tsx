'use client';
import { useParams } from 'next/navigation';
import SideContestBallot from '@/components/contest/SideContestBallot';
export default function ContestPage() {
 const { contestId } = useParams<{contestId:string}>();
 return <SideContestBallot contestId={contestId} displayOnly />;
}
