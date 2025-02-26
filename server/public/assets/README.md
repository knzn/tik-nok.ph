# TikNok Video Watermarking

This directory contains assets used for watermarking videos in the TikNok application.

## Watermark Components

1. **TikNok Logo** - Displayed in the top-left corner of videos
   - Location: `public/assets/tiknok-logo.png`
   - If not present, a placeholder will be generated automatically

2. **Username Watermark** - Displayed in the mid-right side of videos
   - Format: `@username`
   - Style: White text with black shadow for visibility

## Implementation Details

The watermarking is implemented in the video processing service using FFmpeg's complex filters:

1. The logo is overlaid in the top-left corner
2. The username is added as text in the mid-right position
3. Both watermarks are applied during the video transcoding process

## Font Requirements

The system uses Arial font for text watermarking. The font should be placed in:
`public/assets/fonts/Arial.ttf`

If the font is not present, the system will attempt to use system fonts.

## Automatic Asset Generation

If the logo file is not found, the system will automatically generate a simple placeholder logo. 