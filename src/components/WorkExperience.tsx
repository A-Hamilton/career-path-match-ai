import React from 'react';

interface WorkExperienceProps {
    experience: string[];
}

export const WorkExperience: React.FC<WorkExperienceProps> = ({ experience }) => {
    return (
        <ul>
            {experience.map((exp, index) => (
                <li key={index}>{exp}</li>
            ))}
        </ul>
    );
};
