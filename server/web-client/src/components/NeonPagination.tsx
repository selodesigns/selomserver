import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface NeonPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const accentCyan = '#00ffe7';
const accentMagenta = '#ff00ea';
const darkGray = '#181924';
const borderGlow = `0 0 8px ${accentCyan}, 0 0 16px ${accentMagenta}`;

const NeonPagination: React.FC<NeonPaginationProps> = ({ page, totalPages, onPageChange, className }) => {
  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };
  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  // Render page numbers with ellipsis for large page counts
  const renderPageNumbers = () => {
    const numbers = [];
    const maxDisplay = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);
    if (page <= 3) end = Math.min(totalPages, maxDisplay);
    if (page >= totalPages - 2) start = Math.max(1, totalPages - maxDisplay + 1);
    for (let i = start; i <= end; i++) {
      numbers.push(i);
    }
    return (
      <>
        {start > 1 && <span style={{ color: accentCyan, margin: '0 8px' }}>...</span>}
        {numbers.map(n => (
          <IconButton
            key={n}
            onClick={() => onPageChange(n)}
            sx={{
              color: n === page ? accentMagenta : accentCyan,
              background: n === page ? 'rgba(255,0,234,0.15)' : 'transparent',
              border: n === page ? `2px solid ${accentMagenta}` : `1px solid ${accentCyan}`,
              mx: 0.5,
              boxShadow: n === page ? borderGlow : `0 0 4px ${accentCyan}`,
              transition: 'all 0.15s',
              '&:hover': {
                color: accentMagenta,
                borderColor: accentMagenta,
                background: 'rgba(0,255,231,0.09)',
                boxShadow: borderGlow
              }
            }}
            size="small"
            aria-current={n === page ? 'page' : undefined}
            aria-label={n === page ? `Page ${n}, current page` : `Go to page ${n}`}
            disabled={n === page}
          >
            {n}
          </IconButton>
        ))}
        {end < totalPages && <span style={{ color: accentMagenta, margin: '0 8px' }}>...</span>}
      </>
    );
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 2,
        px: 3,
        borderRadius: 2,
        background: darkGray,
        boxShadow: `0 0 24px ${accentCyan}33, 0 0 32px ${accentMagenta}22`,
        border: `2px solid ${accentCyan}`,
        mt: 3,
        userSelect: 'none',
        gap: 1
      }}
    >
      <IconButton
        onClick={handlePrev}
        disabled={page === 1}
        sx={{
          color: accentCyan,
          border: `1px solid ${accentCyan}`,
          background: 'transparent',
          boxShadow: `0 0 6px ${accentCyan}`,
          '&:hover': {
            color: accentMagenta,
            borderColor: accentMagenta,
            background: 'rgba(0,255,231,0.09)',
            boxShadow: borderGlow
          }
        }}
        aria-label="Previous page"
      >
        <ArrowBackIosNewIcon fontSize="small" />
      </IconButton>
      {renderPageNumbers()}
      <IconButton
        onClick={handleNext}
        disabled={page === totalPages}
        sx={{
          color: accentCyan,
          border: `1px solid ${accentCyan}`,
          background: 'transparent',
          boxShadow: `0 0 6px ${accentCyan}`,
          '&:hover': {
            color: accentMagenta,
            borderColor: accentMagenta,
            background: 'rgba(0,255,231,0.09)',
            boxShadow: borderGlow
          }
        }}
        aria-label="Next page"
      >
        <ArrowForwardIosIcon fontSize="small" />
      </IconButton>
      <Typography
        sx={{
          color: accentCyan,
          fontFamily: 'Share Tech Mono, monospace',
          ml: 2,
          textShadow: `0 0 6px ${accentMagenta}`
        }}
        variant="body2"
      >
        Page <span style={{ color: accentMagenta }}>{page}</span> of <span style={{ color: accentCyan }}>{totalPages}</span>
      </Typography>
    </Box>
  );
};

export default NeonPagination;
