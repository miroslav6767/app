import { gsap } from "gsap";

export function playZenvikIntro(): Promise<void> {
    const overlay = document.querySelector<HTMLElement>("#zenvik-intro");
    const zen = document.querySelector<HTMLElement>("#intro-zenvik");
    const security = document.querySelector<HTMLElement>("#intro-security");
    const impact = document.querySelector<HTMLElement>("#intro-impact");
    const finalLogo = document.querySelector<HTMLElement>("#intro-final");

    if (!overlay || !zen || !security || !impact || !finalLogo) {
        return Promise.resolve();
    }

    const stage = overlay.querySelector<HTMLElement>(".intro-stage");

    // Make sure the overlay starts visible.
    gsap.set(overlay, {
        display: "flex",
        opacity: 1,
    });

    gsap.set([zen, security], {
        opacity: 0,
        scale: 0.72,
    });

    gsap.set(zen, {
        x: -360,
        rotation: -8,
    });

    gsap.set(security, {
        x: 360,
        rotation: 8,
    });

    gsap.set(impact, {
        opacity: 0,
        scale: 0,
        borderRadius: "50%",
    });

    gsap.set(finalLogo, {
        opacity: 0,
        scale: 0.45,
        rotation: -4,
    });

    /*
     * Build temporary visual effects.
     * These don't require additional HTML.
     */
    const shockwave = document.createElement("div");
    shockwave.className = "intro-shockwave";

    const flash = document.createElement("div");
    flash.className = "intro-flash";

    const particles = document.createElement("div");
    particles.className = "intro-particles";

    stage?.append(shockwave, flash, particles);

    const particleElements: HTMLSpanElement[] = [];

    for (let i = 0; i < 28; i++) {
        const particle = document.createElement("span");

        particle.className = "intro-particle";

        const angle = Math.random() * Math.PI * 2;
        const distance = 90 + Math.random() * 220;

        particle.dataset.x = String(Math.cos(angle) * distance);
        particle.dataset.y = String(Math.sin(angle) * distance);

        particles.appendChild(particle);
        particleElements.push(particle);
    }

    gsap.set(shockwave, {
        opacity: 0,
        scale: 0.2,
    });

    gsap.set(flash, {
        opacity: 0,
    });

    gsap.set(particleElements, {
        x: 0,
        y: 0,
        scale: 0,
        opacity: 0,
    });

    /*
     * Main intro timeline.
     */
    const timeline = gsap.timeline();

    // --------------------------------------------------
    // 1. Logos enter
    // --------------------------------------------------

    timeline
        .to([zen, security], {
            opacity: 1,
            scale: 1,
            duration: 0.35,
            ease: "power3.out",
        })

        // --------------------------------------------------
        // 2. Accelerate toward each other
        // --------------------------------------------------

        .to(
            zen,
            {
                x: 0,
                rotation: 0,
                duration: 0.78,
                ease: "power4.in",
            },
            "<"
        )

        .to(
            security,
            {
                x: 0,
                rotation: 0,
                duration: 0.78,
                ease: "power4.in",
            },
            "<"
        )

        // --------------------------------------------------
        // 3. Collision
        // --------------------------------------------------

        .to(
            [zen, security],
            {
                scale: 1.12,
                duration: 0.08,
                ease: "power2.out",
            }
        )

        // Controlled flash
        .to(
            flash,
            {
                opacity: 0.9,
                duration: 0.045,
                ease: "none",
            },
            "<"
        )

        .to(
            flash,
            {
                opacity: 0,
                duration: 0.18,
                ease: "power2.out",
            }
        )

        // --------------------------------------------------
        // 4. Shockwave
        // --------------------------------------------------

        .to(
            shockwave,
            {
                opacity: 0.9,
                scale: 0.4,
                duration: 0.08,
                ease: "power2.out",
            },
            "<-0.02"
        )

        .to(
            shockwave,
            {
                opacity: 0,
                scale: 2.8,
                duration: 0.48,
                ease: "power3.out",
            }
        )

        // --------------------------------------------------
        // 5. Particle burst
        // --------------------------------------------------

        .to(
            particleElements,
            {
                opacity: 1,
                scale: 1,
                x: (index, element) =>
                    Number((element as HTMLElement).dataset.x ?? 0),
                y: (index, element) =>
                    Number((element as HTMLElement).dataset.y ?? 0),
                duration: 0.55,
                stagger: {
                    each: 0.008,
                    from: "center",
                },
                ease: "power3.out",
            },
            "<-0.36"
        )

        .to(
            particleElements,
            {
                opacity: 0,
                scale: 0,
                duration: 0.3,
                stagger: 0.005,
                ease: "power2.in",
            },
            "-=0.18"
        )

        // --------------------------------------------------
        // 6. Interlock
        // --------------------------------------------------

        .to(
            zen,
            {
                x: -18,
                scale: 0.88,
                duration: 0.3,
                ease: "power3.inOut",
            }
        )

        .to(
            security,
            {
                x: 18,
                scale: 0.88,
                duration: 0.3,
                ease: "power3.inOut",
            },
            "<"
        )

        // Synchronize
        .to(
            [zen, security],
            {
                scale: 0.94,
                duration: 0.16,
                ease: "power2.out",
            }
        )

        // --------------------------------------------------
        // 7. Security layer forms around Zenvik
        // --------------------------------------------------

        .to(
            security,
            {
                scale: 1.22,
                opacity: 0.72,
                duration: 0.38,
                ease: "power3.inOut",
            }
        )

        .to(
            security,
            {
                scale: 1.08,
                opacity: 0.95,
                duration: 0.2,
                ease: "power2.out",
            }
        )

        // Zenvik remains central
        .to(
            zen,
            {
                scale: 1.02,
                duration: 0.2,
                ease: "power2.out",
            },
            "<"
        )

        // --------------------------------------------------
        // 8. Protection collapses into Zenvik
        // --------------------------------------------------

        .to(
            security,
            {
                scale: 0.25,
                opacity: 0,
                duration: 0.38,
                ease: "power4.in",
            }
        )

        .to(
            zen,
            {
                scale: 1.16,
                duration: 0.16,
                ease: "power2.out",
            },
            "<0.08"
        )

        .to(
            zen,
            {
                scale: 1,
                duration: 0.24,
                ease: "power3.out",
            }
        )

        // --------------------------------------------------
        // 9. Final Zenvik logo
        // --------------------------------------------------

        .to(
            zen,
            {
                opacity: 0,
                scale: 0.78,
                duration: 0.22,
                ease: "power2.in",
            }
        )

        .to(
            finalLogo,
            {
                opacity: 1,
                scale: 1,
                rotation: 0,
                duration: 0.48,
                ease: "back.out(1.7)",
            },
            "-=0.08"
        )

        // Small premium hold
        .to({}, {
            duration: 0.45,
        })

        // --------------------------------------------------
        // 10. Fade into application
        // --------------------------------------------------

        .to(overlay, {
            opacity: 0,
            duration: 0.48,
            ease: "power2.inOut",
        })

        .set(overlay, {
            display: "none",
        });

    return new Promise<void>((resolve) => {
        timeline.eventCallback("onComplete", () => {
            shockwave.remove();
            flash.remove();
            particles.remove();

            resolve();
        });
    });
}