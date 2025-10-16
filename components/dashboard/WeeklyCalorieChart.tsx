import React, { useMemo } from 'react';
import { Meal } from '../../types';

interface WeeklyCalorieChartProps {
    meals: Meal[];
    dailyGoal: number;
}

const ChartBar: React.FC<{ day: string; value: number; goal: number; height: number; width: number; x: number; chartHeight: number }> = ({ day, value, goal, height, width, x, chartHeight }) => {
    return (
        <g>
            <rect
                x={x}
                y={chartHeight - height}
                width={width}
                height={height}
                className={value > goal ? "fill-current text-yellow-400" : "fill-current text-green-500"}
                rx="4"
            >
                <title>{`${day}: ${Math.round(value)} kcal`}</title>
            </rect>
            <text x={x + width / 2} y={chartHeight + 15} textAnchor="middle" className="text-xs fill-current text-gray-400">{day}</text>
        </g>
    );
};

export const WeeklyCalorieChart: React.FC<WeeklyCalorieChartProps> = ({ meals, dailyGoal }) => {
    
    const weeklyData = useMemo(() => {
        const data: { [key: string]: number } = {};
        const labels: string[] = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            const dayLabel = date.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3);
            
            labels.push(dayLabel);
            data[dateString] = 0;
        }

        meals.forEach(meal => {
            const mealDate = new Date(meal.timestamp).toISOString().split('T')[0];
            if (data.hasOwnProperty(mealDate)) {
                data[mealDate] += meal.nutrients.calorie;
            }
        });

        return Object.keys(data).map((date, index) => ({
            day: labels[index],
            calories: data[date],
        }));

    }, [meals]);

    const width = 400;
    const height = 160; // h-40
    const padding = { top: 20, right: 10, bottom: 30, left: 40 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxCalorie = Math.max(...weeklyData.map(d => d.calories), dailyGoal) * 1.1;

    const barWidth = chartWidth / weeklyData.length;
    const barMargin = 10;
    
    return (
        <div className="h-40">
             <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
                {/* Y-axis labels and goal line */}
                <g>
                    <line
                        x1={padding.left}
                        y1={padding.top + chartHeight - (dailyGoal / maxCalorie) * chartHeight}
                        x2={width - padding.right}
                        y2={padding.top + chartHeight - (dailyGoal / maxCalorie) * chartHeight}
                        className="stroke-current text-gray-300 dark:text-gray-600"
                        strokeWidth="1"
                        strokeDasharray="4 2"
                    />
                    <text x={padding.left - 8} y={padding.top + chartHeight - (dailyGoal / maxCalorie) * chartHeight} textAnchor="end" alignmentBaseline="middle" className="text-xs fill-current text-gray-400">
                        {dailyGoal}
                    </text>
                     <text x={padding.left - 8} y={padding.top} textAnchor="end" alignmentBaseline="middle" className="text-xs fill-current text-gray-400">
                        {Math.round(maxCalorie)}
                    </text>
                </g>

                {/* Bars */}
                {weeklyData.map((d, i) => {
                    const barHeight = d.calories > 0 ? (d.calories / maxCalorie) * chartHeight : 0;
                    return (
                        <ChartBar
                            key={d.day + i}
                            day={d.day}
                            value={d.calories}
                            goal={dailyGoal}
                            height={barHeight}
                            width={barWidth - barMargin}
                            x={padding.left + i * barWidth + barMargin / 2}
                            chartHeight={chartHeight + padding.top}
                        />
                    );
                })}
            </svg>
        </div>
    );
};
