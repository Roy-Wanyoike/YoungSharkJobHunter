'use client';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function RechartsTest() {
  return (
    <div>
      <p>Recharts loaded</p>
      <ResponsiveContainer width={200} height={100}>
        <AreaChart data={[{ x: 1, y: 2 }]}>
          <Area dataKey="y" fill="#10b981" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}