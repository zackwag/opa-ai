import { useEffect, useRef, useState } from 'react';
import { getTooltip } from './glossary';

export default function FieldLabel({ text }) {
    const tooltip = getTooltip(text);
    const [show, setShow] = useState(false);
    const [position, setPosition] = useState('below');
    const triggerRef = useRef(null);

    useEffect(() => {
        if (show && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            if (rect.top < 200) {
                setPosition('below');
            } else {
                setPosition('above');
            }
        }
    }, [show]);

    if (!tooltip) {
        return <span className="label">{text}</span>;
    }

    return (
        <button type="button" className="label has-tooltip" ref={triggerRef} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={() => setShow(s => !s)}>
            {text}
            <svg className="info-icon" viewBox="0 0 16 16" width="12" height="12">
                <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {show && (
                <span className={`tooltip-popup ${position}`}>
                    {tooltip}
                </span>
            )}
        </button>
    );
}
