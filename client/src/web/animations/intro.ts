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

    const timeline = gsap.timeline();

    gsap.set(zen, {
        x: -260,
        opacity: 0,
        scale: 0.82,
    });

    gsap.set(security, {
        x: 260,
        opacity: 0,
        scale: 0.82,
    });

    gsap.set(impact, {
        scale: 0,
        opacity: 0,
    });

    gsap.set(finalLogo, {
        scale: 0.7,
        opacity: 0,
    });

    timeline
        .to([zen, security], {
            opacity: 1,
            duration: 0.35,
            ease: "power2.out",
        })
        .to(zen, {
            x: 0,
            duration: 0.9,
            ease: "power4.in",
        }, "<0.05")
        .to(security, {
            x: 0,
            duration: 0.9,
            ease: "power4.in",
        }, "<")
        .to([zen, security], {
            scale: 1.08,
            duration: 0.08,
            ease: "power2.out",
        })
        .to(impact, {
            scale: 1,
            opacity: 1,
            duration: 0.12,
            ease: "power3.out",
        })
        .to(impact, {
            scale: 2.4,
            opacity: 0,
            duration: 0.4,
            ease: "power2.out",
        })
        .to([zen, security], {
            scale: 0.85,
            opacity: 0,
            duration: 0.25,
            ease: "power2.in",
        }, "<0.05")
        .to(finalLogo, {
            scale: 1,
            opacity: 1,
            duration: 0.45,
            ease: "back.out(1.7)",
        })
        .to(overlay, {
            opacity: 0,
            duration: 0.5,
            delay: 0.8,
            ease: "power2.inOut",
        })
        .set(overlay, {
            display: "none",
        });

    return new Promise(resolve => {
        timeline.eventCallback("onComplete", resolve);
    });
}