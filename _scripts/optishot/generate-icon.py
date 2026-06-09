#!/usr/bin/env python3
"""Generate OptiShot app icon."""

from PIL import Image, ImageDraw
import os

def create_icon(size):
    """Create a single icon at the specified size."""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate proportions
    margin = size // 8
    corner_radius = size // 6
    
    # Colors
    bg_color = (52, 152, 219)       # Blue
    bg_color_dark = (41, 128, 185)  # Darker blue
    frame_color = (255, 255, 255)   # White
    arrow_color = (46, 204, 113)    # Green
    
    # Draw rounded rectangle background
    x0, y0 = margin, margin
    x1, y1 = size - margin, size - margin
    
    # Draw main background (rounded rectangle approximation)
    draw.rounded_rectangle([x0, y0, x1, y1], radius=corner_radius, fill=bg_color)
    
    # Draw image/photo frame icon in center
    frame_margin = size // 4
    frame_x0 = frame_margin
    frame_y0 = frame_margin
    frame_x1 = size - frame_margin
    frame_y1 = size - frame_margin
    frame_thickness = max(2, size // 32)
    
    # White frame
    draw.rounded_rectangle(
        [frame_x0, frame_y0, frame_x1, frame_y1],
        radius=corner_radius // 2,
        outline=frame_color,
        width=frame_thickness
    )
    
    # Draw "mountain" landscape inside frame (simplified photo icon)
    mountain_margin = size // 3
    peak_x = size // 2
    peak_y = mountain_margin + size // 8
    left_x = mountain_margin
    right_x = size - mountain_margin
    bottom_y = size - mountain_margin - size // 16
    
    # Mountain shape
    mountain_points = [
        (left_x, bottom_y),
        (peak_x - size // 10, peak_y + size // 6),
        (peak_x, peak_y),
        (peak_x + size // 10, peak_y + size // 6),
        (right_x, bottom_y)
    ]
    draw.polygon(mountain_points, fill=frame_color)
    
    # Sun circle
    sun_radius = size // 14
    sun_x = frame_x1 - size // 6
    sun_y = frame_y0 + size // 6
    draw.ellipse(
        [sun_x - sun_radius, sun_y - sun_radius, 
         sun_x + sun_radius, sun_y + sun_radius],
        fill=frame_color
    )
    
    # Draw compression arrows (corners pointing inward)
    arrow_size = size // 8
    arrow_thickness = max(2, size // 24)
    
    # Top-left arrow
    draw.line([(margin, margin + arrow_size), (margin, margin), (margin + arrow_size, margin)], 
              fill=arrow_color, width=arrow_thickness)
    
    # Top-right arrow
    draw.line([(size - margin - arrow_size, margin), (size - margin, margin), (size - margin, margin + arrow_size)],
              fill=arrow_color, width=arrow_thickness)
    
    # Bottom-left arrow
    draw.line([(margin, size - margin - arrow_size), (margin, size - margin), (margin + arrow_size, size - margin)],
              fill=arrow_color, width=arrow_thickness)
    
    # Bottom-right arrow
    draw.line([(size - margin - arrow_size, size - margin), (size - margin, size - margin), (size - margin, size - margin - arrow_size)],
              fill=arrow_color, width=arrow_thickness)
    
    return img


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Icon sizes needed for macOS .icns
    sizes = [16, 32, 64, 128, 256, 512, 1024]
    
    # Create iconset directory
    iconset_dir = os.path.join(script_dir, "OptiShot.iconset")
    os.makedirs(iconset_dir, exist_ok=True)
    
    # Generate icons at each size
    for size in sizes:
        icon = create_icon(size)
        
        # Save standard resolution
        icon.save(os.path.join(iconset_dir, f"icon_{size}x{size}.png"))
        
        # Save @2x resolution (for Retina displays)
        if size <= 512:
            icon_2x = create_icon(size * 2)
            icon_2x.save(os.path.join(iconset_dir, f"icon_{size}x{size}@2x.png"))
    
    print(f"Icon files generated in: {iconset_dir}")
    print("To create .icns file, run:")
    print(f"  iconutil -c icns {iconset_dir}")


if __name__ == "__main__":
    main()
