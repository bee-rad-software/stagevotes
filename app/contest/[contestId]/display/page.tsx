'use client';
import {useParams} from 'next/navigation';
import ContestAwards from '@/components/contest/ContestAwards';
export default function ContestAwardsPage(){
 const {contestId}=useParams<{contestId:string}>();
 return <ContestAwards contestId={contestId}/>;
}
