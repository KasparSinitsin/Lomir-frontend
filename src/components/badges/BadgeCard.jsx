import React from 'react';
import {
  // Collaboration Skills
  Users, Scale, MessageCircle, Flame, ClipboardList, Anchor,
  // Technical Expertise
  Code, Palette, BarChart2, Wrench, Network, FileText,
  // Creative Thinking
  Lightbulb, Key, Telescope, BookOpen, Paintbrush, PackageOpen,
  // Leadership Qualities
  Compass, GraduationCap, Flag, UserPlus, ChessKnight, MessageSquare,
  // Personal Attributes
  Zap, Heart, Mountain, Search, Shuffle, Share2,
  // Default
  Award
} from 'lucide-react';

const BadgeCard = ({ badge }) => {
  const { name, description, category, color } = badge;
  
  // Get the icon based on badge name
  const renderIcon = () => {
    const iconProps = { size: 24, color: color };
    
    switch (name) {
      // Collaboration Skills
      case 'Team Player': return <Users {...iconProps} />;
      case 'Mediator': return <Scale {...iconProps} />;
      case 'Communicator': return <MessageCircle {...iconProps} />;
      case 'Motivator': return <Flame {...iconProps} />;
      case 'Organizer': return <ClipboardList {...iconProps} />;
      case 'Reliable': return <Anchor {...iconProps} />;
      
      // Technical Expertise
      case 'Coder': return <Code {...iconProps} />;
      case 'Designer': return <Palette {...iconProps} />;
      case 'Data Whiz': return <BarChart2 {...iconProps} />;
      case 'Tech Support': return <Wrench {...iconProps} />;
      case 'Systems Thinker': return <Network {...iconProps} />;
      case 'Documentation Master': return <FileText {...iconProps} />;
      
      // Creative Thinking
      case 'Innovator': return <Lightbulb {...iconProps} />;
      case 'Problem Solver': return <Key {...iconProps} />;
      case 'Visionary': return <Telescope {...iconProps} />;
      case 'Storyteller': return <BookOpen {...iconProps} />;
      case 'Artisan': return <Paintbrush {...iconProps} />;
      case 'Outside-the-Box': return <PackageOpen {...iconProps} />;
      
      // Leadership Qualities
      case 'Decision Maker': return <Compass {...iconProps} />;
      case 'Mentor': return <GraduationCap {...iconProps} />;
      case 'Initiative Taker': return <Flag {...iconProps} />;
      case 'Delegator': return <UserPlus {...iconProps} />;
      case 'Strategic Planner': return <ChessKnight {...iconProps} />;
      case 'Feedback Provider': return <MessageSquare {...iconProps} />;
      
      // Personal Attributes
      case 'Quick Learner': return <Zap {...iconProps} />;
      case 'Empathetic': return <Heart {...iconProps} />;
      case 'Persistent': return <Mountain {...iconProps} />;
      case 'Detail-Oriented': return <Search {...iconProps} />;
      case 'Adaptable': return <Shuffle {...iconProps} />;
      case 'Knowledge Sharer': return <Share2 {...iconProps} />;
      
      default: return <Award {...iconProps} />; // Default badge icon
    }
  };
  
  return (
    <div 
      className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow duration-300"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="card-body p-4">
        <div className="flex items-center mb-2">
          <div className="mr-3">
            {renderIcon()}
          </div>
          <h3 className="card-title text-lg" style={{ color }}>{name}</h3>
        </div>
        <p className="text-sm text-base-content/80">{description}</p>
      </div>
    </div>
  );
};

export default BadgeCard;