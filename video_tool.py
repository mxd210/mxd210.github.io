"""
ai_video_tool.py
==================

This module provides a simple framework for turning text prompts into a
slideshow video. It demonstrates how you might build a custom tool
similar to LarImage/Fliki/Canva, but without the account or usage
restrictions. The core idea is to take a list of prompts, generate
corresponding images, and then stitch those images together into an
MP4 video.

Since this environment does not have access to external AI image
services (like DALL·E or Stable Diffusion) and we don't have API keys
available, the current implementation uses a placeholder image
generator. Each prompt is rendered onto a coloured background using
Pillow. To connect to a real AI service, replace the
`generate_placeholder_image` function with calls to your preferred
API.

Usage example (from a script or Jupyter notebook):

    prompts = [
        "A futuristic city floating above the clouds",
        "A serene landscape with rolling hills and flowing rivers",
        "A cyberpunk robot playing guitar in a neon alley",
    ]

    video_path = build_slideshow(prompts, duration_per_image=4)
    print(f"Slideshow saved to {video_path}")

This will create an `output.mp4` in the current directory. You can
adjust the duration per image, the video size, font, colours and so on.

If you plan to integrate a real image generation API, replace
`generate_placeholder_image` with an asynchronous or synchronous call
to that service and handle saving the resulting images. You may also
add support for negative prompts, style presets, aspect ratios, etc.

"""

import os
import random
import string
from typing import List, Tuple

from PIL import Image, ImageDraw, ImageFont
try:
    from moviepy.editor import ImageClip, concatenate_videoclips  # type: ignore
except Exception:
    # MoviePy may not be installed in this environment.  We'll fall back
    # to OpenCV for writing video files.  Note: OpenCV writes raw video
    # without audio, but is sufficient for slideshow output.
    ImageClip = None  # type: ignore
    concatenate_videoclips = None  # type: ignore

import cv2  # pylint: disable=import-error


def slugify(text: str) -> str:
    """Create a filesystem-friendly slug from arbitrary text."""
    valid_chars = f"{string.ascii_letters}{string.digits}-_"
    slug = ''.join(c if c in valid_chars else '_' for c in text)
    return slug[:50]


def generate_placeholder_image(prompt: str, size: Tuple[int, int] = (1280, 720)) -> Image.Image:
    """
    Generate a placeholder image for a given prompt.  This function
    creates a coloured background and overlays the prompt text in
    the centre. In a production environment you would replace this
    with a call to an AI image generation API.

    Args:
        prompt: The textual prompt to visualise.
        size: A (width, height) tuple specifying the image resolution.

    Returns:
        A Pillow Image instance containing the rendered prompt.
    """
    width, height = size
    # Choose a random pastel background colour
    def random_pastel() -> Tuple[int, int, int]:
        return tuple(random.randint(128, 255) for _ in range(3))

    bg_colour = random_pastel()
    image = Image.new('RGB', (width, height), color=bg_colour)
    draw = ImageDraw.Draw(image)
    # Load a basic font. If unavailable, Pillow will fall back to a default.
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 40)
    except Exception:
        font = ImageFont.load_default()

    # Wrap text to fit within the image width
    max_width = width - 100
    words = prompt.split()
    lines = []
    current_line = ''
    for word in words:
        test_line = f"{current_line} {word}".strip()
        w, _ = draw.textsize(test_line, font=font)
        if w <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    # Calculate vertical position to centre text
    total_text_height = sum(draw.textsize(line, font=font)[1] + 10 for line in lines)
    y_start = (height - total_text_height) // 2
    # Draw each line
    for line in lines:
        w, h = draw.textsize(line, font=font)
        x = (width - w) // 2
        draw.text((x, y_start), line, fill=(20, 20, 20), font=font)
        y_start += h + 10

    return image


def build_slideshow(
    prompts: List[str],
    duration_per_image: int = 5,
    video_size: Tuple[int, int] = (1280, 720),
    output_filename: str = "output.mp4",
) -> str:
    """
    Given a list of prompts, generate a slideshow video. Each prompt
    becomes a separate image, and the resulting images are stitched
    together into a single MP4.

    Args:
        prompts: A list of strings describing the desired images.
        duration_per_image: Seconds each image should appear in the video.
        video_size: Resolution of the generated images/video.
        output_filename: Name of the video file to write.

    Returns:
        Path to the generated MP4 file.
    """
    frames_dir = "generated_frames"
    os.makedirs(frames_dir, exist_ok=True)
    frame_paths: List[str] = []
    for idx, prompt in enumerate(prompts, 1):
        img = generate_placeholder_image(prompt, size=video_size)
        frame_path = os.path.join(frames_dir, f"frame_{idx:03d}_{slugify(prompt)}.png")
        img.save(frame_path)
        frame_paths.append(frame_path)

    if not frame_paths:
        raise ValueError("No prompts provided")

    # If moviepy is available, use it for convenience
    if ImageClip is not None and concatenate_videoclips is not None:
        clips = [ImageClip(fp).set_duration(duration_per_image) for fp in frame_paths]
        final_video = concatenate_videoclips(clips, method="compose")
        final_video.write_videofile(output_filename, fps=24, audio=False)
    else:
        # Fall back to OpenCV for writing video
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        fps = 24
        width, height = video_size
        out = cv2.VideoWriter(output_filename, fourcc, fps, (width, height))
        for frame_path in frame_paths:
            # Duplicate frames to match duration_per_image seconds
            frame = cv2.imread(frame_path)
            if frame is None:
                continue
            # Convert RGB (Pillow) to BGR (OpenCV) if necessary
            if frame.shape[1] != width or frame.shape[0] != height:
                frame = cv2.resize(frame, (width, height))
            for _ in range(int(fps * duration_per_image)):
                out.write(frame)
        out.release()

    return os.path.abspath(output_filename)


if __name__ == "__main__":
    # Example usage when run as a script
    example_prompts = [
        "A tranquil lake surrounded by misty mountains at sunrise",
        "A bustling futuristic cityscape at night with flying cars",
        "A cozy cabin in the woods with smoke rising from the chimney",
    ]
    print("Generating slideshow, this may take a moment…")
    video_path = build_slideshow(example_prompts, duration_per_image=4)
    print(f"Finished! Video saved to: {video_path}")
