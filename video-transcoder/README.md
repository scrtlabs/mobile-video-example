# Video transcoding with encryption

### Requirements

- Node.js
- Download [ffmpeg and ffprobe](https://ffmpeg.org/download.html) for your system and save them to this directory

On linux you can install from the mainline repo using:
`apt-get install ffmpeg`

### Usage

Place your video file in an input directory, create an output directory and run the following commands:

**Windows:**

```bash
node transcode [input directory] [output directory] [encoder type | cpu, intel, nvidia]
```

For example: 

```
node transcode d:\tmp d:\tmp\output intel
```

It is recommended to use intel or nvidia encoders to significantly decrease the encoding time.  
_Notice: Intel encoding may not work out of the box on Intel's 12th gen CPU, AMD CPUs not supported without Nvidia GPU_

**Linux**  

If you have Nvidia GPU please use it, otherwise use CPU.  

**macOS:**  


```bash
node transcode [input directory] [output directory]
Example: node transcode d:\tmp d:\tmp\output
```

The script will use the default apple hardware encoder (videotoolbox)
