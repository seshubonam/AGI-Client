import React, { useRef, useEffect, useState } from 'react';
import { client } from '@gradio/client';
import { getHtml } from './gradioLayout';

function GradioEmbed({ agiData }) {

    // Prepare Data
    const embedRef = useRef(null);
    const [app, setApp] = useState(null);
    const [appError, setAppError] = useState(null);

    useEffect(() => {
        if (!appError) {

            // Error
            const tinyError = (err) => {
                console.error(err);
                setAppError(err);
            };

            // Load App
            if (!app) {
                client(agiData.url).then(newApp => setApp(newApp)).catch(tinyError);
            }

            // Execute Data
            else {

                // Insert Embed
                const embed = $(embedRef.current);
                if (embed.find('gladio-embed').length < 1) {

                    // Read Template
                    const page = $('<gradio-embed>').append(getHtml(app)).data('gladio_app', app);
                    embed.append(page);

                    return () => {
                        page.remove();
                    };

                }

            }

        }
    });

    // Temp result. (I'm using this only to have a preview. This will be removed later.)
    return <div ref={embedRef} className='mt-2 ratio ratio-16x9 embed-video enabled agi-client-embed'>
        <iframe title='gradio' src={agiData.url} />
    </div>;

};

export default GradioEmbed;