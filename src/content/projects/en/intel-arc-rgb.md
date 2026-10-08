---
title: "Intel Arc B580 RGB"
date: "2026-01-15"
lang: "en"
slug: "intel-arc-rgb"
translationKey: "intel-arc-rgb"
tagline: "Hardware reverse engineering"
summary: "Reverse-engineered the I²C RGB controller on an ASRock Intel Arc B580 to enable open-source RGB control via OpenRGB."
tags: ["Reverse Engineering","I²C","SMBus","OpenRGB"]
highlights: ["I²C / SMBus bus analysis and controller address discovery.","PCI device and GPU register probing.","Nuvoton MCU firmware investigation (APROM / LDROM).","Packet construction verified on real hardware, upstreamed to OpenRGB."]
featured: true
span: "full"
---

A deep-dive hardware investigation into the ASRock Steel Legend Intel Arc B580, which shipped with no open-source RGB support.

The work traced the I²C / SMBus path, probed PCI device registers and analysed the Nuvoton MCU firmware to reconstruct the proprietary control protocol, then fed the findings back into OpenRGB.
