# General requirements about using LiveLabs and OCI

## Introduction

Welcome to Oracle CloudWorld 2022! For you to get the best and the most seamless workshop experience, please make sure you have the following requirements on your laptop.

### Objectives

- Use supported browsers
- Use supported browsers and servers for noVNC

## Task 1: Use Supported Browsers

You need to have one of the browsers mentioned below to complete any workshop.

Oracle Cloud Infrastructure supports the following browsers and versions:

- Google Chrome 69 or later
- Safari 12.1 or later
- Firefox 62 or later (OCI Console does not support Firefox Private Browsing)


## Task 2: User Supported Browsers and Servers

Some hands-on workshops use *[noVNC](https://novnc.com/info.html)*. To complete a *noVNC* workshop, you need to satisfy the following requirements.

1. Browser requirement: noVNC uses many modern web technologies, so a formal requirement list is not available. However, these are the minimum versions we are currently aware of:

    - Chrome 64
    - Firefox 79
    - Safari 13.4
    - Opera 51
    - Edge 79

2. Server Requirements

    noVNC follows the standard VNC protocol, but unlike other VNC clients, it does require *WebSockets support*. Many servers include support (e.g. [x11vnc/libvncserver](http://libvncserver.sourceforge.net/), [QEMU](http://www.qemu.org/), and [MobileVNC](http://www.smartlab.at/mobilevnc/)). However, for the others, you need to use a WebSockets to TCP socket proxy. noVNC has a sister project [websockify](https://github.com/novnc/websockify) that provides a simple proxy.

## Learn More

* Click [here](https://docs.oracle.com/en-us/iaas/Content/GSG/Tasks/signingin.htm#supported_browsers) to know more about the requirements for signing into Oracle Cloud Infrastructure.
* Click [here](https://github.com/novnc/noVNC#browser-requirements) to know more about the requirements for using noVNC.

## Acknowledgements

* **Author** - Arabella Yao, Oracle Database Product Management, Product Manager
* **Last Updated By/Date** - Arabella Yao, July 2022
