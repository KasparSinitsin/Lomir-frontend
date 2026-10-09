import React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/layout/PageContainer';
import BadgeCategorySection from '../components/badges/BadgeCategorySection';
import Alert from '../components/common/Alert';

const BadgeOverview = () => {
  const { t } = useTranslation();
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
        setError(true);
        setLoading(false);
        console.error(err);
      }
    };

    fetchBadges();
  }, []);

  if (loading) {
    return (
      <PageContainer variant="muted">
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer variant="muted">
        <Alert type="error" message={t("badgeOverview.loadError")} className="w-full shadow-sm" />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t("badgeOverview.title")}
      subtitle={t("badgeOverview.intro")}
      variant="muted"
    >
      {Object.entries(badgeCategories).map(([category, badges]) => (
        <BadgeCategorySection
          key={category}
          category={category}
          badges={badges}
        />
      ))}
    </PageContainer>
  );
};

// Temporary function to provide badge data until we integrate with the API
const getBadgeData = () => {
  return [
    // Collaboration Skills
    { id: 1, name: 'Team Player', description: 'Consistently contributes to team goals and supports fellow members', category: 'Collaboration Skills' },
    { id: 2, name: 'Mediator', description: 'Helps resolve conflicts and find middle ground between different opinions', category: 'Collaboration Skills' },
    { id: 3, name: 'Communicator', description: 'Clear and effective in expressing ideas and listening to others', category: 'Collaboration Skills' },
    { id: 4, name: 'Motivator', description: 'Inspires others and maintains positive energy within the team', category: 'Collaboration Skills' },
    { id: 5, name: 'Organizer', description: 'Keeps projects structured, manages timelines, and coordinates efforts', category: 'Collaboration Skills' },
    { id: 6, name: 'Reliable', description: 'Consistently delivers on commitments and meets deadlines', category: 'Collaboration Skills' },

    // Technical Expertise
    { id: 7, name: 'Coder', description: 'Skilled in programming languages and development', category: 'Technical Expertise' },
    { id: 8, name: 'Designer', description: 'Creates visually appealing and user-friendly interfaces', category: 'Technical Expertise' },
    { id: 9, name: 'Data Whiz', description: 'Excels at analyzing, interpreting, and visualizing data', category: 'Technical Expertise' },
    { id: 10, name: 'Tech Support', description: 'Helps troubleshoot and solve technical problems', category: 'Technical Expertise' },
    { id: 11, name: 'Systems Thinker', description: 'Understands complex systems and how components interact', category: 'Technical Expertise' },
    { id: 12, name: 'Documentation Master', description: 'Creates clear, thorough, and helpful documentation', category: 'Technical Expertise' },

    // Creative Thinking
    { id: 13, name: 'Innovator', description: 'Consistently brings fresh ideas and novel approaches', category: 'Creative Thinking' },
    { id: 14, name: 'Problem Solver', description: 'Finds creative solutions to challenging situations', category: 'Creative Thinking' },
    { id: 15, name: 'Visionary', description: 'Sees the big picture and envisions future possibilities', category: 'Creative Thinking' },
    { id: 16, name: 'Storyteller', description: 'Communicates ideas effectively through compelling narratives', category: 'Creative Thinking' },
    { id: 17, name: 'Artisan', description: 'Creates beautiful and high-quality work in any medium', category: 'Creative Thinking' },
    { id: 18, name: 'Outside-the-Box', description: 'Approaches challenges with unconventional thinking', category: 'Creative Thinking' },

    // Leadership Qualities
    { id: 19, name: 'Decision Maker', description: 'Makes timely, thoughtful choices that move projects forward', category: 'Leadership Qualities' },
    { id: 20, name: 'Mentor', description: 'Helps others develop their skills through guidance and support', category: 'Leadership Qualities' },
    { id: 21, name: 'Initiative Taker', description: 'Proactively identifies opportunities and takes action', category: 'Leadership Qualities' },
    { id: 22, name: 'Delegator', description: 'Effectively distributes responsibilities based on team strengths', category: 'Leadership Qualities' },
    { id: 23, name: 'Strategic Planner', description: 'Develops comprehensive, long-term approaches to achieving goals', category: 'Leadership Qualities' },
    { id: 24, name: 'Feedback Provider', description: 'Offers constructive criticism that helps others improve', category: 'Leadership Qualities' },

    // Personal Attributes
    { id: 25, name: 'Quick Learner', description: 'Rapidly adapts to new information and technologies', category: 'Personal Attributes' },
    { id: 26, name: 'Empathetic', description: 'Understands others perspectives and emotional needs', category: 'Personal Attributes' },
    { id: 27, name: 'Persistent', description: 'Overcomes obstacles with determination and resilience', category: 'Personal Attributes' },
    { id: 28, name: 'Detail-Oriented', description: 'Notices and addresses small details others might miss', category: 'Personal Attributes' },
    { id: 29, name: 'Adaptable', description: 'Flexibly responds to changing circumstances and requirements', category: 'Personal Attributes' },
    { id: 30, name: 'Knowledge Sharer', description: 'Generously shares expertise and helps others learn', category: 'Personal Attributes' }
  ];
};

export default BadgeOverview;
