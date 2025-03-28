import React from 'react';
import { useEffect, useState } from 'react';
import PageContainer from '../components/layout/PageContainer';
import BadgeCategorySection from '../components/badges/BadgeCategorySection';
import api from '../services/api';

const BadgeOverview = () => {
  const [badgeCategories, setBadgeCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setLoading(true);
        // In a real implementation, you would fetch this from your API
        // const response = await api.get('/badges');
        // const badges = response.data;
        
        // For now, we'll use our hardcoded data
        const badges = getBadgeData();
        
        // Group badges by category
        const groupedBadges = badges.reduce((acc, badge) => {
          if (!acc[badge.category]) {
            acc[badge.category] = [];
          }
          acc[badge.category].push(badge);
          return acc;
        }, {});
        
        setBadgeCategories(groupedBadges);
        setLoading(false);
      } catch (err) {
        setError('Failed to load badges');
        setLoading(false);
        console.error(err);
      }
    };

    fetchBadges();
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Badge Overview</h1>
        <p className="mb-8 text-base-content/80">
          Badges recognize skills, qualities, and contributions of team members in Lomir. 
          They are awarded by peers and showcase strengths across different categories.
        </p>
        
        {Object.entries(badgeCategories).map(([category, badges]) => (
          <BadgeCategorySection 
            key={category} 
            category={category} 
            badges={badges} 
          />
        ))}
      </div>
    </PageContainer>
  );
};

// Temporary function to provide badge data until we integrate with the API
const getBadgeData = () => {
  return [
    // Collaboration Skills (Blue)
    { id: 1, name: 'Team Player', description: 'Consistently contributes to team goals and supports fellow members', category: 'Collaboration Skills', color: '#3B82F6' },
    { id: 2, name: 'Mediator', description: 'Helps resolve conflicts and find middle ground between different opinions', category: 'Collaboration Skills', color: '#3B82F6' },
    { id: 3, name: 'Communicator', description: 'Clear and effective in expressing ideas and listening to others', category: 'Collaboration Skills', color: '#3B82F6' },
    { id: 4, name: 'Motivator', description: 'Inspires others and maintains positive energy within the team', category: 'Collaboration Skills', color: '#3B82F6' },
    { id: 5, name: 'Organizer', description: 'Keeps projects structured, manages timelines, and coordinates efforts', category: 'Collaboration Skills', color: '#3B82F6' },
    { id: 6, name: 'Reliable', description: 'Consistently delivers on commitments and meets deadlines', category: 'Collaboration Skills', color: '#3B82F6' },

    // Technical Expertise (Green)
    { id: 7, name: 'Coder', description: 'Skilled in programming languages and development', category: 'Technical Expertise', color: '#10B981' },
    { id: 8, name: 'Designer', description: 'Creates visually appealing and user-friendly interfaces', category: 'Technical Expertise', color: '#10B981' },
    { id: 9, name: 'Data Whiz', description: 'Excels at analyzing, interpreting, and visualizing data', category: 'Technical Expertise', color: '#10B981' },
    { id: 10, name: 'Tech Support', description: 'Helps troubleshoot and solve technical problems', category: 'Technical Expertise', color: '#10B981' },
    { id: 11, name: 'Systems Thinker', description: 'Understands complex systems and how components interact', category: 'Technical Expertise', color: '#10B981' },
    { id: 12, name: 'Documentation Master', description: 'Creates clear, thorough, and helpful documentation', category: 'Technical Expertise', color: '#10B981' },

    // Creative Thinking (Purple)
    { id: 13, name: 'Innovator', description: 'Consistently brings fresh ideas and novel approaches', category: 'Creative Thinking', color: '#8B5CF6' },
    { id: 14, name: 'Problem Solver', description: 'Finds creative solutions to challenging situations', category: 'Creative Thinking', color: '#8B5CF6' },
    { id: 15, name: 'Visionary', description: 'Sees the big picture and envisions future possibilities', category: 'Creative Thinking', color: '#8B5CF6' },
    { id: 16, name: 'Storyteller', description: 'Communicates ideas effectively through compelling narratives', category: 'Creative Thinking', color: '#8B5CF6' },
    { id: 17, name: 'Artisan', description: 'Creates beautiful and high-quality work in any medium', category: 'Creative Thinking', color: '#8B5CF6' },
    { id: 18, name: 'Outside-the-Box', description: 'Approaches challenges with unconventional thinking', category: 'Creative Thinking', color: '#8B5CF6' },

    // Leadership Qualities (Red)
    { id: 19, name: 'Decision Maker', description: 'Makes timely, thoughtful choices that move projects forward', category: 'Leadership Qualities', color: '#EF4444' },
    { id: 20, name: 'Mentor', description: 'Helps others develop their skills through guidance and support', category: 'Leadership Qualities', color: '#EF4444' },
    { id: 21, name: 'Initiative Taker', description: 'Proactively identifies opportunities and takes action', category: 'Leadership Qualities', color: '#EF4444' },
    { id: 22, name: 'Delegator', description: 'Effectively distributes responsibilities based on team strengths', category: 'Leadership Qualities', color: '#EF4444' },
    { id: 23, name: 'Strategic Planner', description: 'Develops comprehensive, long-term approaches to achieving goals', category: 'Leadership Qualities', color: '#EF4444' },
    { id: 24, name: 'Feedback Provider', description: 'Offers constructive criticism that helps others improve', category: 'Leadership Qualities', color: '#EF4444' },

    // Personal Attributes (Yellow)
    { id: 25, name: 'Quick Learner', description: 'Rapidly adapts to new information and technologies', category: 'Personal Attributes', color: '#F59E0B' },
    { id: 26, name: 'Empathetic', description: 'Understands others perspectives and emotional needs', category: 'Personal Attributes', color: '#F59E0B' },
    { id: 27, name: 'Persistent', description: 'Overcomes obstacles with determination and resilience', category: 'Personal Attributes', color: '#F59E0B' },
    { id: 28, name: 'Detail-Oriented', description: 'Notices and addresses small details others might miss', category: 'Personal Attributes', color: '#F59E0B' },
    { id: 29, name: 'Adaptable', description: 'Flexibly responds to changing circumstances and requirements', category: 'Personal Attributes', color: '#F59E0B' },
    { id: 30, name: 'Knowledge Sharer', description: 'Generously shares expertise and helps others learn', category: 'Personal Attributes', color: '#F59E0B' }
  ];
};

export default BadgeOverview;