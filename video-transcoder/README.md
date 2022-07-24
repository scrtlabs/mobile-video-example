# Video transcoding with encryption

### Requirements

- Node.js
- Download [ffmpeg and ffprobe](https://ffmpeg.org/download.html) for your system and save them to this directory

### Usage

**Windows / Linux:**

```bash
node transcode [input directory] [output directory] [encoder type | cpu, intel, nvidia]
Example: node transcode d:\tmp d:\tmp\output intel

```

It is recommended to use intel or nvidia encoders to significantly decrease the encoding time.  
_Notice: Intel encoding may not work out of the box on Intel's 12th gen CPU._

**macOS:**  

```bash
node transcode [input directory] [output directory]
Example: node transcode d:\tmp d:\tmp\output
```

The script will use the default apple hardware encoder (videotoolbox)
